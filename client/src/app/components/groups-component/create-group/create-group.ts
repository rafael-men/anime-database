import {
  Component,
  Output,
  EventEmitter,
  inject,
  input,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupsService, Group } from '../../../../api/services/groups.service';
import { SessionService } from '../../../../api/services/session.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group.html',
  styleUrl: './create-group.css',
})
export class CreateGroup implements OnInit, OnChanges {
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  readonly group = input<Group | null>(null);

  private readonly groupsService = inject(GroupsService);
  private readonly sessionService = inject(SessionService);

  name = '';
  description = '';
  isPublic = true;
  coverImageUrl = '';

  isSubmitting = signal(false);
  errorMessage = signal('');

  get descriptionCharCount(): number {
    return this.description.length;
  }

  get isEditMode(): boolean {
    return !!this.group();
  }

  ngOnInit(): void {
    this.prefill();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group']) {
      this.prefill();
    }
  }

  submit(): void {
    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.errorMessage.set('O nome do grupo é obrigatório.');
      return;
    }

    const user = this.sessionService.getUser();
    if (!user) {
      this.errorMessage.set('Sessão expirada. Faça login novamente.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    if (this.isEditMode) {
      const group = this.group()!;
      this.groupsService
        .updateGroup(group.id, {
          name: trimmedName,
          description: this.description.trim() || undefined,
          isPublic: this.isPublic,
          coverImageUrl: this.coverImageUrl.trim() || undefined,
        })
        .pipe(
          catchError(() => {
            this.errorMessage.set('Erro ao atualizar o grupo. Tente novamente.');
            this.isSubmitting.set(false);
            return of(null);
          }),
        )
        .subscribe((updated) => {
          if (updated) {
            this.saved.emit();
          }
        });
      return;
    }

    this.groupsService
      .createGroup({
        ownerId: user.userId,
        name: trimmedName,
        description: this.description.trim() || undefined,
        isPublic: this.isPublic,
        coverImageUrl: this.coverImageUrl.trim() || undefined,
      })
      .pipe(
        catchError(() => {
          this.errorMessage.set('Erro ao criar o grupo. Tente novamente.');
          this.isSubmitting.set(false);
          return of(null);
        }),
      )
      .subscribe((group) => {
        if (group) {
          this.saved.emit();
        }
      });
  }

  private prefill(): void {
    const group = this.group();
    if (group) {
      this.name = group.name;
      this.description = group.description ?? '';
      this.coverImageUrl = group.coverImageUrl ?? '';
      this.isPublic = group.isPublic;
    } else {
      this.name = '';
      this.description = '';
      this.coverImageUrl = '';
      this.isPublic = true;
    }
    this.errorMessage.set('');
  }

  cancelCreate(): void {
    this.cancel.emit();
  }
}
